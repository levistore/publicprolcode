import Image from 'next/image'

/**
 * ClassHub mascot — brand identity component.
 * Uses the original mascot PNG (transparent, unmodified).
 * `size` controls display width; aspect ratio 1:1 preserved.
 */
export function Mascot({
  size = 96,
  className = '',
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/mascot.png"
      alt="Maskot ClassHub"
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className={`select-none ${className}`}
    />
  )
}
