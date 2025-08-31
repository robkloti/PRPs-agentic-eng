'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Upload, X, Image, FileText, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AssetUploaderProps {
  onUpload?: (files: File[]) => void
  acceptedTypes?: string[]
  maxFiles?: number
  category: 'branding' | 'clients' | 'case-studies' | 'tech-stack' | 'projects'
}

const AssetUploader: React.FC<AssetUploaderProps> = ({
  onUpload,
  acceptedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
  maxFiles = 10,
  category
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => acceptedTypes.includes(file.type)
    ).slice(0, maxFiles)

    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles].slice(0, maxFiles))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      const validFiles = Array.from(selectedFiles).filter(
        file => acceptedTypes.includes(file.type)
      ).slice(0, maxFiles)
      
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles].slice(0, maxFiles))
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('category', category)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      console.log('Upload successful:', result)

      // Update uploaded files list
      const fileNames = files.map(file => file.name.replace(/[^a-zA-Z0-9.-]/g, '_'))
      setUploaded(prev => [...prev, ...fileNames])

      if (onUpload) {
        onUpload(files)
      }

      // Clear files after successful upload
      setFiles([])
      
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getCategoryInfo = () => {
    switch (category) {
      case 'branding':
        return {
          title: 'Company Branding',
          description: 'Upload your GYST company logo and brand assets',
          suggestions: ['SVG format recommended for scalability', 'Include dark/light variants', 'Transparent backgrounds preferred']
        }
      case 'clients':
        return {
          title: 'Client Logos',
          description: 'Upload client brand logos (PNG, SVG preferred)',
          suggestions: ['Use transparent backgrounds', 'Minimum 200px width', 'Vector formats (SVG) preferred']
        }
      case 'case-studies':
        return {
          title: 'Case Study Images',
          description: 'Upload project screenshots and results graphics',
          suggestions: ['High resolution (minimum 1200px width)', 'Use actual project screenshots', 'Include before/after comparisons']
        }
      case 'tech-stack':
        return {
          title: 'Technology Logos',
          description: 'Upload logos of technologies and tools we use',
          suggestions: ['Official brand logos only', 'SVG or high-res PNG', 'Consistent sizing preferred']
        }
      case 'projects':
        return {
          title: 'Project Gallery',
          description: 'Upload project images and portfolio pieces',
          suggestions: ['Showcase actual work', 'High quality images', 'Multiple angles/views']
        }
      default:
        return {
          title: 'Upload Assets',
          description: 'Upload files for this category',
          suggestions: ['Follow best practices for your file type']
        }
    }
  }

  const categoryInfo = getCategoryInfo()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          {categoryInfo.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <motion.div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          whileHover={{ scale: dragActive ? 1 : 1.02 }}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {dragActive ? 'Drop files here' : 'Drop files or click to upload'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Supports: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>

        {/* Best Practices */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Best Practices:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {categoryInfo.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        {/* File Preview */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Files to Upload:</h4>
            <div className="grid grid-cols-1 gap-3">
              {files.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {file.type.split('/')[1]}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
            
            <Button 
              onClick={handleUpload} 
              className="w-full"
              disabled={files.length === 0}
            >
              Upload {files.length} file{files.length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Upload Success */}
        {uploaded.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="font-semibold">Successfully uploaded!</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Files saved to: <code className="bg-muted px-1 rounded">public/images/{category}/</code>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

export default AssetUploader