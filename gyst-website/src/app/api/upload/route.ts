import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const files: File[] = data.getAll('files') as File[]
    const category = data.get('category') as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
    }

    const validCategories = ['branding', 'clients', 'case-studies', 'tech-stack', 'projects']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const uploadedFiles: string[] = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'images', category)
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // Generate safe filename
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = join(uploadDir, fileName)

      // Write file
      await writeFile(filePath, buffer)
      uploadedFiles.push(`/images/${category}/${fileName}`)

      console.log(`Uploaded file: ${fileName} to ${category}`)
    }

    return NextResponse.json({ 
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      category 
    })

  } catch (error) {
    console.error('Error uploading files:', error)
    return NextResponse.json(
      { error: 'Failed to upload files.' },
      { status: 500 }
    )
  }
}