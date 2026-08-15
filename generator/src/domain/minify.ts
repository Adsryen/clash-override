import { parseGeneratedScript } from './script'

export async function minifyGeneratedScript(source: string): Promise<string> {
  parseGeneratedScript(source)

  const { minify } = await import('terser')

  const result = await minify(source, {
    compress: true,
    mangle: true,
    format: {
      comments: /@clash-override-generator/,
    },
  })

  if (!result.code) {
    throw new Error('无法压缩脚本')
  }

  parseGeneratedScript(result.code)
  return result.code
}
