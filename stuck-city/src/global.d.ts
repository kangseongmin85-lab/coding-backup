import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': {
        icon: string
        width?: string | number
        height?: string | number
        class?: string
        style?: React.CSSProperties
      }
    }
  }
}
