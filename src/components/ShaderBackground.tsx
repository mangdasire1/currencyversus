"use client"

import { useEffect, useRef } from "react"

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const glOrNull = canvas.getContext("webgl")
    if (!glOrNull) return
    const gl: WebGLRenderingContext = glOrNull

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const vertSrc = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `

    const fragSrc = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.05;
        float lineWidth = 0.002;
        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) / abs(
              fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0
              - length(uv)
              + mod(uv.x + uv.y, 0.2)
            );
          }
        }
        gl_FragColor = vec4(color[0], color[1], color[2], 1.0);
      }
    `

    function compile(type: number, src: string): WebGLShader | null {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (gl.deleteShader(s), null)
    }

    const vert = compile(gl.VERTEX_SHADER, vertSrc)
    const frag = compile(gl.FRAGMENT_SHADER, fragSrc)
    if (!vert || !frag) return

    const prog = gl.createProgram()!
    gl.attachShader(prog, vert)
    gl.attachShader(prog, frag)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    const aPos = gl.getAttribLocation(prog, "aPosition")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "resolution")
    const uTime = gl.getUniformLocation(prog, "time")

    const resize = () => {
      const w = canvas.clientWidth * window.devicePixelRatio
      const h = canvas.clientHeight * window.devicePixelRatio
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      gl.uniform2f(uRes, w, h)
    }
    resize()
    window.addEventListener("resize", resize)

    let time = 1.0
    let animId = 0

    if (prefersReduced) {
      gl.uniform1f(uTime, time)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    } else {
      const tick = () => {
        time += 0.05
        gl.uniform1f(uTime, time)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        animId = requestAnimationFrame(tick)
      }
      animId = requestAnimationFrame(tick)
    }

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animId)
      gl.deleteProgram(prog)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0"
      style={{ background: "#000" }}
    />
  )
}
