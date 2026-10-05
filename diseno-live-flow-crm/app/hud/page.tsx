import type { Metadata } from 'next'
import { LiveHud } from '@/components/liveflow/hud/live-hud'

export const metadata: Metadata = { title: 'Live HUD — LiveFlow CRM' }

export default function HudPage() {
  return <LiveHud />
}
