import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="mt-4 text-xl font-semibold">Pagina no encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La ventana que buscas no existe.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Volver al tablero
      </Link>
    </div>
  );
}