import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'audio' // 'image' | 'audio'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const rawExt = file.name.split('.').pop() || (type === 'image' ? 'png' : 'mp3')
    const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '')
    const safeName = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type)
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, safeName)
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/${type}/${safeName}`
    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileType: cleanExt,
    })
  } catch (err: any) {
    console.error('Upload API route error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save upload' },
      { status: 500 }
    )
  }
}

