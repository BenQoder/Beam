type Props = {
  postId: string
  count: number
}

export function LikeButton({ postId, count }: Props) {
  return (
    <button
      
      beam-action="like"
      beam-params={JSON.stringify({ postId })}
      beam-target={`#likes-${postId}`}
      data-optimistic={`<span>❤️ ${count + 1}</span>`}
      class="like-btn"
    >
      <span id={`likes-${postId}`}>❤️ {count}</span>
    </button>
  )
}
