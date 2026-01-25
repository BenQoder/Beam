export function Pagination({ currentPage, totalPages, baseUrl = '?page=' }: { currentPage: number; totalPages: number; baseUrl?: string }) {
  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i)
  }

  return (
    <nav class="pagination">
      <button
        beam-action="getProducts"
        beam-params={JSON.stringify({ page: currentPage - 1 })}
        beam-target="#product-list"
        beam-replace={`${baseUrl}${currentPage - 1}`}
        disabled={currentPage <= 1}
        class="pagination-btn"
      >
        ← Prev
      </button>

      <div class="pagination-pages">
        {pages.map((page) => (
          <button
            beam-action="getProducts"
            beam-params={JSON.stringify({ page })}
            beam-target="#product-list"
            beam-replace={`${baseUrl}${page}`}
            class={`pagination-page ${page === currentPage ? 'active' : ''}`}
            disabled={page === currentPage}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        beam-action="getProducts"
        beam-params={JSON.stringify({ page: currentPage + 1 })}
        beam-target="#product-list"
        beam-replace={`${baseUrl}${currentPage + 1}`}
        disabled={currentPage >= totalPages}
        class="pagination-btn"
      >
        Next →
      </button>
    </nav>
  )
}
