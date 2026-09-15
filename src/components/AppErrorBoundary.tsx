import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat aplikasi.",
    }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("[app] gagal merender aplikasi:", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main
        className="min-h-full flex items-center justify-center px-6"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(124,58,237,0.12)", color: "var(--accent)" }}
          >
            !
          </div>
          <h1 className="text-lg font-semibold">Aplikasi gagal dimuat</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Muat ulang halaman untuk mencoba kembali.
          </p>
          {this.state.message && (
            <p className="mt-3 break-words rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-500">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Muat ulang
          </button>
        </section>
      </main>
    )
  }
}
