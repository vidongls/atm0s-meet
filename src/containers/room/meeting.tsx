'use client'

import { AudioMixerPlayer, PeerLocal, PeerRemote } from '@/components'
import { useDeviceStream } from '@/hooks'
import { RoomStore } from '@/stores/room'
import { useRemotePeers, useRoom } from '@atm0s-media-sdk/react-hooks'
import { useUser } from '@clerk/nextjs'
import { useSetAtom } from 'jotai'
import { filter, find, map } from 'lodash'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BottomBar, GridViewLayout, SidebarViewLayout } from './components'

type Props = {
  host: string | null
}

export const Meeting: React.FC<Props> = ({ host }) => {
  const params = useParams()
  const room = useRoom()
  const remotePeers = useRemotePeers()
  const { user } = useUser()
  const addListUserToRoom = useSetAtom(RoomStore.addListUserToRoom)

  const streamVideoScreen = useDeviceStream('video_screen')
  const meetingLink = `${host}/invite/${params?.room}`

  const [videoScreen, setVideoScreen] = useState<any>()
  const peerLocal = useMemo(
    () => <PeerLocal sourceName="video_main" streamVideoScreen={streamVideoScreen} />,
    [streamVideoScreen]
  )

  const peerScreenShare = useMemo(() => {
    if (!videoScreen) return peerLocal
    const findScreenShare: any = find(remotePeers, (p: any) => p.peer === videoScreen?.peer)
    return <PeerRemote peer={findScreenShare} />
  }, [peerLocal, remotePeers, videoScreen])

  const peerRemoteMixerAudio = useMemo(() => {
    const filterRemotePeers = filter(remotePeers, (p) => p.peer != room?.peer)
    const mapRemotePeers = map(filterRemotePeers, (p) => (
      <PeerRemote key={p.peer} peer={p} setVideoScreen={setVideoScreen} />
    ))

    if (videoScreen) return [peerLocal, ...mapRemotePeers]

    return mapRemotePeers
  }, [peerLocal, remotePeers, room?.peer, videoScreen])

  useEffect(() => {
    addListUserToRoom({
      users: [
        {
          gmail: user?.emailAddresses?.[0]?.emailAddress as string,
          name: user?.fullName ?? '',
          avatar: user?.imageUrl as string,
        },
        ...map(remotePeers, (item) => ({ gmail: item.peer, name: item.peer, avatar: '' })),
      ],
      roomCode: (params?.room ?? '') as string,
    })
  }, [addListUserToRoom, params?.room, remotePeers, user])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex h-full w-full flex-col">
        {streamVideoScreen || videoScreen ? (
          <SidebarViewLayout items={[peerScreenShare, ...(peerRemoteMixerAudio || [])]} renderItem={(i) => i} />
        ) : (
          <GridViewLayout items={[peerLocal, ...(peerRemoteMixerAudio || [])]} renderItem={(i) => i} />
        )}
        <AudioMixerPlayer />
        <BottomBar meetingLink={meetingLink} />
      </div>
    </div>
  )
}
