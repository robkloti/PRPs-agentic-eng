import { Metadata } from 'next'
import AssetUploader from '@/components/admin/asset-uploader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Asset Management - GYST Admin',
  description: 'Upload and manage client logos, case study images, and brand assets',
}

export default function AssetsAdminPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Asset Management
          </h1>
          <p className="text-muted-foreground">
            Upload and organize client logos, case study images, technology stack logos, and project gallery images.
          </p>
        </div>

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="branding">Your Logo</TabsTrigger>
            <TabsTrigger value="clients">Client Logos</TabsTrigger>
            <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
            <TabsTrigger value="tech-stack">Tech Stack</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Company Logo</CardTitle>
                <CardDescription>
                  Upload your GYST company logo for use in the header, footer, and other branding elements throughout the site.
                  SVG format is recommended for crisp scaling across all devices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetUploader 
                  category="branding"
                  acceptedTypes={['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']}
                  maxFiles={5}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Logo Variations</CardTitle>
                <CardDescription>
                  Upload different versions of your logo (dark mode, light mode, horizontal, icon only, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center p-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-primary font-bold">G</span>
                    </div>
                    <p className="text-sm text-center">Main Logo</p>
                  </div>
                  <div className="aspect-square bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center">Dark Mode<br/>Version</p>
                  </div>
                  <div className="aspect-square bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center">Horizontal<br/>Layout</p>
                  </div>
                  <div className="aspect-square bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center">Icon Only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Brand Logos</CardTitle>
                <CardDescription>
                  Upload client logos to showcase your partnerships and build trust. 
                  These will appear in case studies and client showcase sections.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetUploader 
                  category="clients"
                  acceptedTypes={['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']}
                  maxFiles={20}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Client Logos</CardTitle>
                <CardDescription>
                  Preview of uploaded client logos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* These would be dynamically loaded from your file system */}
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Galaxy Housing</p>
                  </div>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Force at Work</p>
                  </div>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">RC Wallet</p>
                  </div>
                  <div className="aspect-square bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Drop logos here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="case-studies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Study Images</CardTitle>
                <CardDescription>
                  Upload screenshots, dashboards, results graphics, and before/after comparisons 
                  for your case studies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetUploader 
                  category="case-studies"
                  acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
                  maxFiles={50}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tech-stack" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Technology Stack Logos</CardTitle>
                <CardDescription>
                  Upload logos of technologies, frameworks, and tools you use. 
                  These showcase your technical expertise and capabilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetUploader 
                  category="tech-stack"
                  acceptedTypes={['image/png', 'image/svg+xml', 'image/webp']}
                  maxFiles={30}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggested Technologies</CardTitle>
                <CardDescription>
                  Common AI/ML technologies to showcase your expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-semibold">AI/ML Frameworks</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• OpenAI</li>
                      <li>• LangChain</li>
                      <li>• Pinecone</li>
                      <li>• Anthropic</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Development</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• React/Next.js</li>
                      <li>• Python</li>
                      <li>• TypeScript</li>
                      <li>• Node.js</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Cloud & Infrastructure</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• AWS</li>
                      <li>• Vercel</li>
                      <li>• Docker</li>
                      <li>• PostgreSQL</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">AI Tools</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Hugging Face</li>
                      <li>• Weights & Biases</li>
                      <li>• MLflow</li>
                      <li>• TensorFlow</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Gallery</CardTitle>
                <CardDescription>
                  Upload high-quality images of your projects, prototypes, and implementations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetUploader 
                  category="projects"
                  acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
                  maxFiles={100}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Quick Access</CardTitle>
            <CardDescription>
              Direct file system access for advanced users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-mono text-sm space-y-1">
              <p><span className="text-muted-foreground">Your branding:</span> <code>public/images/branding/</code></p>
              <p><span className="text-muted-foreground">Client logos:</span> <code>public/images/clients/</code></p>
              <p><span className="text-muted-foreground">Case studies:</span> <code>public/images/case-studies/</code></p>
              <p><span className="text-muted-foreground">Tech stack:</span> <code>public/images/tech-stack/</code></p>
              <p><span className="text-muted-foreground">Projects:</span> <code>public/images/projects/</code></p>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              You can also directly drop files into these folders and they'll appear on your website.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}