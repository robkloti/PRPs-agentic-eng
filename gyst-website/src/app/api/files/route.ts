import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json({ error: 'Category parameter is required.' }, { status: 400 })
    }

    const validCategories = ['branding', 'clients', 'case-studies', 'tech-stack', 'projects']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), 'public', 'images', category)
    
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ files: [] })
    }

    const files = await readdir(uploadDir)
    const imageFiles = files
      .filter(file => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file))
      .map(file => ({
        name: file.replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, ''),
        src: `/images/${category}/${file}`,
        alt: file.replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, '').replace(/[-_]/g, ' ')
      }))

    return NextResponse.json({ files: imageFiles })

  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json(
      { error: 'Failed to list files.' },
      { status: 500 }
    )
  }
}