'use client'

import { useCallback, useRef, useState } from 'react'
import type { JSX } from 'react'
import {
  IconFileArchive, IconFileDoc, IconFileImage, IconFilePdf, IconFileSheet,
  IconFileSlide, IconFileText, IconFiles, IconUpload, IconX,
} from '@/components/icons'
import { extensionOf, fileKindOf, type FileKind } from '@/lib/files/validate'

const ICONS: Record<FileKind, (p: { size?: number }) => JSX.Element> = {
  pdf: IconFilePdf,
  doc: IconFileDoc,
  sheet: IconFileSheet,
  slide: IconFileSlide,
  image: IconFileImage,
  text: IconFileText,
  archive: IconFileArchive,
  other: IconFiles,
}

/** Ikon tipe file. Tidak pernah memakai emoji. */
export function FileTypeIcon({ mime, name, size = 18 }: { mime: string; name: string; size?: number }) {
  const kind = fileKindOf(extensionOf(name), mime)
  const Cmp = ICONS[kind] ?? IconFiles
  return <Cmp size={size} />
}

/** Warna halus perjenis file (bukan neon). */
export function fileKindClass(mime: string, name: string): string {
  const kind = fileKindOf(extensionOf(name), mime)
  switch (kind) {
    case 'pdf': return 'text-danger'
    case 'doc': return 'text-accent'
    case 'sheet': return 'text-success'
    case 'slide': return 'text-warning'
    case 'image': return 'text-accent-2'
    default: return 'text-text-secondary'
  }
}
