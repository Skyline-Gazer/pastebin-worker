export function ErrorState({ message }: { message: string }) {
  return (
    <p role="alert" className="text-destructive">
      {message}
    </p>
  )
}
