import type { Metadata } from 'next'
import { CuadreView } from '@/components/liveflow/cuadre/cuadre-view'

export const metadata: Metadata = { title: 'Cuadre de caja — LiveFlow CRM' }

export default function CuadrePage() {
  return <CuadreView />
}
