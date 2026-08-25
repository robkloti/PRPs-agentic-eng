"""
Project 3: AI Agent with Tools - Web Search Tool
===============================================

Learning objectives:
- Implement tool interfaces with proper typing
- Handle async operations and error recovery
- Practice result validation and caching
- Learn tool integration patterns
"""

import asyncio
import json
import time
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, HttpUrl, validator
from enum import Enum
import aiohttp
import hashlib
from urllib.parse import quote, urljoin


class SearchEngine(str, Enum):
    """Supported search engines"""
    GOOGLE = "google"
    BING = "bing"
    DUCKDUCKGO = "duckduckgo"
    TAVILY = "tavily"


class SearchResultType(str, Enum):
    """Types of search results"""
    WEB = "web"
    NEWS = "news"
    IMAGES = "images"
    VIDEOS = "videos"
    SCHOLARLY = "scholarly"


class SearchResult(BaseModel):
    """Individual search result"""
    title: str = Field(..., min_length=1)
    url: HttpUrl = Field(...)
    snippet: str = Field(..., description="Short description/excerpt")
    domain: str = Field(..., description="Domain name of the result")
    published_date: Optional[datetime] = None
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    result_type: SearchResultType = Field(default=SearchResultType.WEB)
    
    @validator('domain', always=True)
    def extract_domain(cls, v, values):
        """Extract domain from URL if not provided"""
        if not v and 'url' in values:
            from urllib.parse import urlparse
            parsed = urlparse(str(values['url']))
            return parsed.netloc
        return v
    
    @property
    def is_recent(self, days: int = 7) -> bool:
        """Check if result is from recent days"""
        if not self.published_date:
            return False
        return datetime.utcnow() - self.published_date <= timedelta(days=days)


class SearchParameters(BaseModel):
    """Parameters for web search"""
    query: str = Field(..., min_length=1, max_length=500)
    engine: SearchEngine = Field(default=SearchEngine.GOOGLE)
    result_type: SearchResultType = Field(default=SearchResultType.WEB)
    max_results: int = Field(default=10, ge=1, le=100)
    language: str = Field(default="en")
    region: str = Field(default="us")
    safe_search: bool = Field(default=True)
    time_filter: Optional[str] = Field(None, description="e.g., 'past_day', 'past_week'")
    
    # Advanced parameters
    exact_phrase: bool = Field(default=False)
    exclude_domains: List[str] = Field(default_factory=list)
    include_domains: List[str] = Field(default_factory=list)
    
    @validator('query')
    def validate_query(cls, v):
        """Validate and clean search query"""
        v = v.strip()
        if not v:
            raise ValueError("Search query cannot be empty")
        
        # Remove excessive whitespace
        import re
        v = re.sub(r'\s+', ' ', v)
        
        return v
    
    @property
    def cache_key(self) -> str:
        """Generate cache key for this search"""
        # Create deterministic key based on parameters
        key_data = f"{self.query}|{self.engine}|{self.result_type}|{self.max_results}|{self.language}"
        return hashlib.md5(key_data.encode()).hexdigest()


class SearchResponse(BaseModel):
    """Response from search operation"""
    parameters: SearchParameters
    results: List[SearchResult] = Field(default_factory=list)
    total_results: int = Field(default=0, ge=0)
    search_time: float = Field(..., ge=0.0, description="Search execution time in seconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    engine_used: SearchEngine
    
    # Metadata
    spelling_correction: Optional[str] = None
    related_queries: List[str] = Field(default_factory=list)
    search_id: str = Field(default_factory=lambda: str(time.time()))
    
    @property
    def has_results(self) -> bool:
        """Check if search returned results"""
        return len(self.results) > 0
    
    @property
    def top_domains(self) -> List[str]:
        """Get most common domains in results"""
        from collections import Counter
        domains = [result.domain for result in self.results]
        return [domain for domain, _ in Counter(domains).most_common(5)]
    
    def filter_by_domain(self, domain: str) -> List[SearchResult]:
        """Filter results by specific domain"""
        return [r for r in self.results if r.domain == domain]
    
    def get_recent_results(self, days: int = 7) -> List[SearchResult]:
        """Get results from recent days"""
        return [r for r in self.results if r.is_recent(days)]


class SearchCache(BaseModel):
    """Simple in-memory cache for search results"""
    cache: Dict[str, SearchResponse] = Field(default_factory=dict)
    max_size: int = Field(default=1000, gt=0)
    ttl_seconds: int = Field(default=3600, gt=0)  # 1 hour
    
    def get(self, cache_key: str) -> Optional[SearchResponse]:
        """Get cached result if valid"""
        if cache_key not in self.cache:
            return None
        
        result = self.cache[cache_key]
        
        # Check if expired
        age = datetime.utcnow() - result.timestamp
        if age.total_seconds() > self.ttl_seconds:
            del self.cache[cache_key]
            return None
        
        return result
    
    def set(self, cache_key: str, response: SearchResponse) -> None:
        """Cache a search response"""
        # Implement simple LRU by removing oldest if at capacity
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self.cache.keys(), 
                           key=lambda k: self.cache[k].timestamp)
            del self.cache[oldest_key]
        
        self.cache[cache_key] = response
    
    def clear_expired(self) -> int:
        """Remove expired entries, return count removed"""
        now = datetime.utcnow()
        expired_keys = []
        
        for key, response in self.cache.items():
            age = now - response.timestamp
            if age.total_seconds() > self.ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
        
        return len(expired_keys)


class WebSearchTool:
    """Web search tool with multiple search engine support"""
    
    def __init__(self, api_keys: Dict[str, str] = None, cache_enabled: bool = True):
        self.api_keys = api_keys or {}
        self.cache = SearchCache() if cache_enabled else None
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def search(self, parameters: SearchParameters) -> SearchResponse:
        """Perform web search with given parameters"""
        start_time = time.time()
        
        # Check cache first
        if self.cache:
            cached = self.cache.get(parameters.cache_key)
            if cached:
                print(f"🔄 Cache hit for: {parameters.query[:50]}...")
                return cached
        
        try:
            # Route to appropriate search engine
            if parameters.engine == SearchEngine.DUCKDUCKGO:
                results = await self._search_duckduckgo(parameters)
            elif parameters.engine == SearchEngine.TAVILY:
                results = await self._search_tavily(parameters)
            else:
                # Fallback to mock search for demo purposes
                results = await self._mock_search(parameters)
            
            search_time = time.time() - start_time
            
            response = SearchResponse(
                parameters=parameters,
                results=results,
                total_results=len(results),
                search_time=search_time,
                engine_used=parameters.engine
            )
            
            # Cache the response
            if self.cache:
                self.cache.set(parameters.cache_key, response)
            
            print(f"🔍 Search completed: {len(results)} results in {search_time:.2f}s")
            return response
        
        except Exception as e:
            search_time = time.time() - start_time
            print(f"❌ Search failed after {search_time:.2f}s: {e}")
            
            # Return empty response on error
            return SearchResponse(
                parameters=parameters,
                results=[],
                total_results=0,
                search_time=search_time,
                engine_used=parameters.engine
            )
    
    async def _search_duckduckgo(self, params: SearchParameters) -> List[SearchResult]:
        """Search using DuckDuckGo (simplified implementation)"""
        if not self.session:
            raise RuntimeError("Session not initialized")
        
        # DuckDuckGo Instant Answer API (limited functionality)
        url = "https://api.duckduckgo.com/"
        query_params = {
            'q': params.query,
            'format': 'json',
            'no_redirect': '1',
            'no_html': '1',
            'skip_disambig': '1'
        }
        
        try:
            async with self.session.get(url, params=query_params, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    results = []
                    
                    # Parse related topics (limited results)
                    related_topics = data.get('RelatedTopics', [])
                    for i, topic in enumerate(related_topics[:params.max_results]):
                        if isinstance(topic, dict) and 'FirstURL' in topic:
                            result = SearchResult(
                                title=topic.get('Text', 'No title')[:100],
                                url=topic['FirstURL'],
                                snippet=topic.get('Text', 'No description')[:300],
                                domain='',  # Will be auto-extracted
                                relevance_score=max(0.1, 1.0 - (i * 0.1))
                            )
                            results.append(result)
                    
                    return results
                
        except Exception as e:
            print(f"DuckDuckGo search error: {e}")
        
        return []
    
    async def _search_tavily(self, params: SearchParameters) -> List[SearchResult]:
        """Search using Tavily API (requires API key)"""
        api_key = self.api_keys.get('tavily')
        if not api_key:
            print("⚠️ Tavily API key not provided, using mock results")
            return await self._mock_search(params)
        
        # Tavily search implementation would go here
        # For demo purposes, return mock results
        return await self._mock_search(params)
    
    async def _mock_search(self, params: SearchParameters) -> List[SearchResult]:
        """Mock search for demonstration purposes"""
        await asyncio.sleep(0.5)  # Simulate API delay
        
        # Generate mock results based on query
        query_lower = params.query.lower()
        
        mock_results = []
        
        # Technology-related results
        if any(term in query_lower for term in ['python', 'programming', 'code', 'ai', 'machine learning']):
            mock_results = [
                {
                    'title': 'Python Official Documentation',
                    'url': 'https://docs.python.org/3/',
                    'snippet': 'The official Python documentation with tutorials, library reference, and language reference.',
                    'domain': 'docs.python.org',
                    'relevance_score': 0.95
                },
                {
                    'title': 'Real Python - Python Tutorials',
                    'url': 'https://realpython.com/',
                    'snippet': 'Python tutorials, guides, and articles for beginners and advanced developers.',
                    'domain': 'realpython.com',
                    'relevance_score': 0.90
                },
                {
                    'title': 'Stack Overflow - Python Questions',
                    'url': 'https://stackoverflow.com/questions/tagged/python',
                    'snippet': 'Ask and answer Python programming questions with the developer community.',
                    'domain': 'stackoverflow.com',
                    'relevance_score': 0.85
                }
            ]
        
        # Business/general results
        else:
            mock_results = [
                {
                    'title': f'Everything about {params.query}',
                    'url': f'https://example.com/topic/{quote(params.query.lower())}',
                    'snippet': f'Comprehensive information about {params.query} with detailed explanations and examples.',
                    'domain': 'example.com',
                    'relevance_score': 0.90
                },
                {
                    'title': f'{params.query} - Wikipedia',
                    'url': f'https://en.wikipedia.org/wiki/{quote(params.query.replace(" ", "_"))}',
                    'snippet': f'Wikipedia article covering {params.query} with references and related topics.',
                    'domain': 'en.wikipedia.org',
                    'relevance_score': 0.85
                },
                {
                    'title': f'Latest News about {params.query}',
                    'url': f'https://news.example.com/topic/{quote(params.query)}',
                    'snippet': f'Recent news and updates related to {params.query} from reliable sources.',
                    'domain': 'news.example.com',
                    'relevance_score': 0.80
                }
            ]
        
        # Add more results up to max_results
        base_results = mock_results[:params.max_results]
        
        # Convert to SearchResult objects
        results = []
        for i, result_data in enumerate(base_results):
            result = SearchResult(
                title=result_data['title'],
                url=result_data['url'],
                snippet=result_data['snippet'],
                domain=result_data['domain'],
                relevance_score=result_data['relevance_score'] - (i * 0.01),
                published_date=datetime.utcnow() - timedelta(days=i)
            )
            results.append(result)
        
        return results


# Tool interface functions for LangGraph integration
def create_web_search_tool(api_keys: Dict[str, str] = None):
    """Create web search tool instance"""
    return WebSearchTool(api_keys=api_keys)


async def web_search(query: str, max_results: int = 10, engine: str = "google") -> Dict[str, Any]:
    """Simple web search function for tool calling"""
    try:
        search_engine = SearchEngine(engine.lower())
    except ValueError:
        search_engine = SearchEngine.GOOGLE
    
    params = SearchParameters(
        query=query,
        engine=search_engine,
        max_results=max_results
    )
    
    async with WebSearchTool() as tool:
        response = await tool.search(params)
    
    # Return serializable dictionary
    return {
        "query": query,
        "results_count": len(response.results),
        "search_time": response.search_time,
        "results": [
            {
                "title": result.title,
                "url": str(result.url),
                "snippet": result.snippet,
                "domain": result.domain,
                "relevance": result.relevance_score
            }
            for result in response.results
        ],
        "top_domains": response.top_domains,
        "timestamp": response.timestamp.isoformat()
    }


async def web_search_examples():
    """Demonstrate web search tool functionality"""
    print("=== Web Search Tool Examples ===\n")
    
    # Test different search parameters
    test_queries = [
        {
            "query": "Python machine learning tutorials",
            "engine": SearchEngine.DUCKDUCKGO,
            "max_results": 5
        },
        {
            "query": "latest AI developments 2024",
            "engine": SearchEngine.GOOGLE,
            "max_results": 3
        },
        {
            "query": "data science best practices",
            "engine": SearchEngine.DUCKDUCKGO,
            "max_results": 7
        }
    ]
    
    async with WebSearchTool() as tool:
        for test in test_queries:
            print(f"🔍 Searching: '{test['query']}'")
            
            params = SearchParameters(
                query=test["query"],
                engine=test["engine"],
                max_results=test["max_results"]
            )
            
            response = await tool.search(params)
            
            print(f"   Engine: {response.engine_used.value}")
            print(f"   Results: {len(response.results)}")
            print(f"   Time: {response.search_time:.2f}s")
            print(f"   Top domains: {response.top_domains[:3]}")
            
            # Show first result
            if response.results:
                first_result = response.results[0]
                print(f"   Best result: {first_result.title}")
                print(f"   URL: {first_result.url}")
                print(f"   Snippet: {first_result.snippet[:100]}...")
            
            print()
    
    # Test caching
    print("--- Caching Test ---")
    async with WebSearchTool(cache_enabled=True) as tool:
        params = SearchParameters(query="Python programming", max_results=3)
        
        # First search
        print("First search (no cache):")
        response1 = await tool.search(params)
        print(f"   Time: {response1.search_time:.2f}s")
        
        # Second search (should hit cache)
        print("Second search (cached):")
        response2 = await tool.search(params)
        print(f"   Time: {response2.search_time:.2f}s")
        print(f"   Same results: {response1.results == response2.results}")


async def tool_integration_example():
    """Show how to integrate with LangGraph tool calling"""
    print("\n=== Tool Integration Example ===\n")
    
    # Simulate tool call from agent
    result = await web_search(
        query="Pydantic validation best practices",
        max_results=5,
        engine="duckduckgo"
    )
    
    print("Tool call result:")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(web_search_examples())
    asyncio.run(tool_integration_example())