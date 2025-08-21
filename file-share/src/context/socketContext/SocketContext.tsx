import { createContext, ReactNode, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client";
import { Profile } from "../../component/Card/Card";


interface EmitEvent {
    requestSendFile: (from: String, to: String, fileName: String, fileSize: Number) => void,
    cancelRequestSendFile: (from: String, to: String) => void,
    denyRequest: (from: String, to: String) => void,
    acceptRequest: (from: String, to: String) => void,
    sendOffer: (from: String, to: String, offer: RTCSessionDescriptionInit) => void
    sendAnswer: (from: String, to: String, answer: RTCSessionDescriptionInit) => void
    sendCandidate: (from: String, to: String, ice: RTCIceCandidate) => void
}

export const SocketContext = createContext<{
    socket: Socket | null,
    me: Profile | null,
    error: Object | null,
    listUser: Profile[],
    emitEvent: EmitEvent,
    signalMap: Map<String, any>,
    removeSignal: (id: String) => void
} | null>(null)

export const SocketProvider: React.FC<{ children: ReactNode, roomId: String }> = ({ children, roomId }) => {




    const socket = useRef<Socket | null>(null)

    const me = useRef<Profile | null>(null);
    const [error, setError] = useState<Object | null>(null);

    const [listUser, setListUser] = useState<Profile[]>([]);

    const [signalMap, setSignalMap] = useState<Map<String, any>>(new Map())

    useEffect(() => {
        const client = io(import.meta.env.VITE_SIGNAL_URL);

        client.on('connect', () => {
            console.log('Connected!');
            socket.current = client
            setError(null);
            client.emit('REGISTER', { roomId: roomId });
        })

        client.on('REGISTER_RESPONSE', ({ id, avatar, name, roomId }, list) => {
            me.current = { id, avatar, name, roomId };
            setListUser(list.filter((user: Profile) => user.id !== id));

        });
        client.on("USER_LIST", (list) => {

            setListUser(list.filter((user: Profile) => user.id !== me.current?.id));
        });




        client.on('connect_error', (err) => {
            setError(err)
            socket.current = null
        });

        client.on('SIGNAL', (data) => {
            console.log(data);
            setSignalMap(pre => {
                const map = new Map(pre)
                map.set(data.from, data)
                return map
            })
        })



        return () => {
            client.disconnect();
        };
    }, []);

    const requestSendFile = (from: String, to: String, fileName: String, fileSize: Number) => {
        socket.current?.emit('SIGNAL', {
            type: 'REQUEST_SEND',
            from: from,
            to: to,
            fileName: fileName,
            fileSize: fileSize
        })
    }

    const cancelRequestSendFile = (from: String, to: String) => {
        socket.current?.emit('SIGNAL', {
            type: 'CANCEL_REQUEST',
            from: from,
            to: to
        })
    }
    const denyRequest = (from: String, to: String) => {
        socket.current?.emit('SIGNAL', {
            type: 'DENY_REQUEST',
            from: from,
            to: to
        })
    }

    const acceptRequest = (from: String, to: String) => {
        socket.current?.emit('SIGNAL', {
            type: 'ACCEPT_REQUEST',
            from: from,
            to: to
        })
    }


    const sendOffer = (from: String, to: String, offer: RTCSessionDescriptionInit) => {
        socket.current?.emit('SIGNAL', {
            type: 'OFFER',
            from: from,
            to: to,
            offer: offer
        })
    }

    const sendAnswer = (from: String, to: String, answer: RTCSessionDescriptionInit) => {
        socket.current?.emit('SIGNAL', {
            type: 'ANSWER',
            from: from,
            to: to,
            answer: answer
        })
    }

    const sendCandidate = (from: String, to: String, ice: RTCIceCandidate) => {
        socket.current?.emit('SIGNAL', {
            type: 'ICE',
            from: from,
            to: to,
            ice: ice
        })
    }


    const removeSignal = (id: String) => {
        setSignalMap(pre => {
            const map = new Map(pre)
            map.delete(id)
            return map
        })
    }



    return (
        <SocketContext.Provider value={{ socket: socket.current, me: me.current, error, listUser, emitEvent: { requestSendFile, cancelRequestSendFile, denyRequest, acceptRequest, sendOffer, sendAnswer, sendCandidate }, signalMap, removeSignal }}>
            {children}
        </SocketContext.Provider>
    )
}