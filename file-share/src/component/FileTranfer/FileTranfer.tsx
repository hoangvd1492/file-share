import { useContext, useEffect, useRef, useState } from 'react'
import './FileTranfer.scss'
import { SocketContext } from '../../context/socketContext/SocketContext';
import { ProgressBar, ProgressProp } from '../ProgessBar/ProgressBar';

const config = {
    iceServers: [
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ],
}

enum Status {
    DEFAULT,
    PENDING_PEER_ACCEPT,
    PENDIND_ACCEPT,
    DENY,
    SENDING,
    ERROR,
    SUCCESS
}

export const FileTranfer: React.FC<{ yourID: String, peerID: String }> = ({ yourID, peerID }) => {


    const context = useContext(SocketContext)

    if (!context) {
        console.error('Not found socket context!');
        return
    }

    const { emitEvent, signalMap, removeSignal } = context

    const [fileComing, setFileComing] = useState<{ fileName: string, fileSize: number }>({ fileName: '', fileSize: 0 })


    let peerConnection = useRef<RTCPeerConnection | null>(null)
    let dataChannel = useRef<RTCDataChannel | null>(null)

    useEffect(() => {
        console.log(signalMap);

        if (signalMap.has(peerID)) {
            const signal = signalMap.get(peerID)
            switch (signal.type) {
                case 'REQUEST_SEND':
                    setStatus(Status.PENDIND_ACCEPT)
                    setFileComing({ fileName: signal.fileName, fileSize: signal.fileSize })
                    break;
                case 'CANCEL_REQUEST':
                    setStatus(Status.DEFAULT)
                    setFileComing({ fileName: '', fileSize: 0 })
                    removeSignal(peerID)
                    break;
                case 'DENY_REQUEST':
                    setStatus(Status.DENY)
                    removeSignal(peerID)
                    break;
                case 'ACCEPT_REQUEST':
                    setStatus(Status.SENDING)
                    peerConnection.current = new RTCPeerConnection(config)
                    peerConnection.current.onicecandidate = (e) => {
                        if (e.candidate) {
                            console.log('ice');
                            emitEvent.sendCandidate(yourID, peerID, e.candidate)
                        }
                    }
                    createOffer()

                    break;

                case 'OFFER':
                    createAnswer(signal.offer)
                    break;

                case 'ANSWER':
                    setAnswer(signal.answer)
                    console.log(peerConnection.current);

                    break;
                case 'ICE':
                    setICE(signal.ice)
                    break;
                default:
                    break;
            }
        }



    }, [signalMap])


    const [file, setFile] = useState<File | null>(null)

    const [status, setStatus] = useState<Status>(Status.DEFAULT)

    const [progressProp, setProgressProp] = useState<ProgressProp>({ max: 0, value: 0 })

    const onChangeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {

        if (![Status.DEFAULT, Status.DENY, Status.SUCCESS].includes(status)) {
            return
        }

        if ([Status.DENY, Status.SUCCESS].includes(status)) {
            setStatus(Status.DEFAULT)
        }
        const files = e.target.files
        if (files && files.length > 0) {
            setFile(files[0])
        }

    }


    const inputRef = useRef<HTMLInputElement | null>(null)




    const onClearFile = () => {
        if (![Status.DEFAULT, Status.DENY, Status.SUCCESS].includes(status)) {
            return
        }

        if ([Status.DENY, Status.SUCCESS].includes(status)) {
            setStatus(Status.DEFAULT)
        }
        setFile(null)
        if (inputRef.current) {
            inputRef.current.value = ''
        }
    }

    const handleClickSendButton = () => {
        if (!file) {
            console.warn('File not found!');
            return
        }

        setStatus(Status.PENDING_PEER_ACCEPT)
        emitEvent.requestSendFile(yourID, peerID, file.name, file.size)

    }

    const handleClickCancelButton = () => {
        setStatus(Status.DEFAULT)
        emitEvent.cancelRequestSendFile(yourID, peerID)
    }


    const handleClickAcceptButton = () => {
        setStatus(Status.SENDING)
        emitEvent.acceptRequest(yourID, peerID)

    }

    const handleClickDenyButton = () => {
        setStatus(Status.DEFAULT)
        setFileComing({ fileName: '', fileSize: 0 })
        emitEvent.denyRequest(yourID, peerID)
        removeSignal(peerID)
    }

    const createOffer = async () => {
        if (!peerConnection.current) {
            console.warn('Peer Connection was not created!');
            return
        }

        dataChannel.current = peerConnection.current.createDataChannel('channel')

        dataChannel.current.binaryType = 'arraybuffer'
        dataChannel.current.onopen = () => {

            if (dataChannel.current) {
                const { readyState } = dataChannel.current;
                console.log(`Send channel state is: ${readyState}`);
                if (readyState === 'open') {
                    setProgressProp(pre => ({ ...pre, max: file?.size || 0 }))
                    sendFile(file);
                }
            }
        }

        dataChannel.current.onclose = () => {
            console.log('Data channel close!');
            closeConnection();
        }

        dataChannel.current.onerror = (e) => {
            console.error('Data channel error: ', e);
            closeConnection();
        }



        const offer = await peerConnection.current.createOffer()
        await peerConnection.current.setLocalDescription(offer)

        emitEvent.sendOffer(yourID, peerID, offer)




    }

    const createAnswer = async (offer: RTCSessionDescriptionInit) => {
        peerConnection.current = new RTCPeerConnection(config)
        peerConnection.current.onicecandidate = (e) => {
            if (e.candidate) {
                emitEvent.sendCandidate(yourID, peerID, e.candidate)
            }
        }



        peerConnection.current.ondatachannel = e => {
            setProgressProp(pre => ({ ...pre, max: fileComing.fileSize || 0 }))
            e.channel.onclose = () => {
                console.log('Data channel close!');
                closeConnection();
            }

            e.channel.onerror = (e) => {
                console.error('Data channel error: ', e);
                closeConnection();
            }
            receiveFile(e.channel)

        }

        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await peerConnection.current.createAnswer()
            await peerConnection.current.setLocalDescription(answer)
            emitEvent.sendAnswer(yourID, peerID, answer)
        } catch (error) {
            console.error('Lỗi setRemoteDescription', error);
            setStatus(Status.ERROR)
            closeConnection();
        }


    }


    const setAnswer = async (answer: RTCSessionDescriptionInit) => {
        if (!peerConnection.current) {
            console.warn('Peer Connection was not created!');
            return
        }
        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Answer đã được thiết lập thành công.');
        } catch (error) {
            console.error('Không thể thiết lập answer. Vấn đề có thể là:', error);
            setStatus(Status.ERROR)
            closeConnection();
        }


    }

    const setICE = async (ice: RTCIceCandidate) => {
        if (!peerConnection.current) {
            console.warn('Peer Connection was not created!');
            return
        }
        try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(ice))
            console.log('ICE đã được thiết lập thành công.');
        } catch (error) {
            console.error('Lỗi addIceCandidate', error);
            setStatus(Status.ERROR)
            closeConnection();
        }

    }



    const sendFile = (file: File | null) => {


        if (!file || file.size === 0) {
            console.warn('File is empty, please select a non-empty file');
            return;
        }

        if (!dataChannel.current) {
            console.log(`DataChannel is not opened!`);
            return

        }

        const chunkSize = 16384;
        const fileReader = new FileReader();
        let offset = 0;
        fileReader.addEventListener('error', error => console.error('Error reading file:', error));
        fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
        fileReader.addEventListener('load', e => {

            if (e.target?.result instanceof ArrayBuffer) {
                dataChannel.current?.send(e.target.result);
                offset += e.target.result.byteLength;
                setProgressProp(pre => ({ ...pre, value: offset }))
                console.log(`${offset} == ${file.size}`);

                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    const onBufferedAmountLow = () => {
                        dataChannel.current?.send('END_FILE');
                        console.log('END_FILE');

                        dataChannel.current?.removeEventListener('bufferedamountlow', onBufferedAmountLow);

                        setProgressProp({ value: 0, max: 0 });
                        setStatus(Status.SUCCESS);
                        closeConnection();
                        setFile(null)
                    };
                    dataChannel.current?.addEventListener('bufferedamountlow', onBufferedAmountLow);
                }
            }
        });
        const readSlice = (o: number) => {
            const slice = file.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    }




    const receiveFile = (channel: RTCDataChannel) => {


        const receiveArr: ArrayBuffer[] = []
        let receiveByte = 0

        channel.binaryType = 'arraybuffer'
        channel.onmessage = e => {
            if (e.data instanceof ArrayBuffer) {

                receiveArr.push(e.data)
                receiveByte += e.data.byteLength

                setProgressProp(pre => ({ ...pre, value: receiveByte }))

                console.log(`${receiveByte} == ${fileComing.fileSize}`);

            } else if (e.data === "END_FILE") {
                console.log(e.data);

                const file = new Blob(receiveArr)
                const downloadUrl = URL.createObjectURL(file);


                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = fileComing.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setStatus(Status.SUCCESS)
            }
        }
    }

    const closeConnection = () => {
        if (dataChannel.current) {
            dataChannel.current.close()
            dataChannel.current = null
        }
        if (peerConnection.current) {
            peerConnection.current.close()
            peerConnection.current = null
        }
    }



    return (
        <div className='file_tranfer'>
            <div className='file_tranfer__input'>
                <input type="file" name="file" id={String(peerID)} disabled={![Status.DEFAULT, Status.DENY, Status.SUCCESS].includes(status)} onChange={onChangeFileInput} ref={ref => inputRef.current = ref} />
                <div className={![Status.DEFAULT, Status.DENY, Status.SUCCESS].includes(status) ? 'disabled label__input' : 'label__input'} >
                    <label htmlFor={String(peerID)}>  <span> <i className="bi bi-upload"></i> {file ? file.name : 'Choose a file'}</span></label>
                    <div style={{ display: file ? 'block' : 'none' }} className='clear__file' onClick={onClearFile}>
                        <i className="bi bi-x"></i>
                    </div>
                </div>
            </div>


            <div className="button__group">
                {file && [Status.DEFAULT, Status.DENY].includes(status) && <div>
                    <button id='file_tranfer__button--send' onClick={handleClickSendButton}>Send</button>
                </div>}
                {file && status === Status.PENDING_PEER_ACCEPT &&
                    <div>
                        <button id='file_tranfer__button--cancel' onClick={handleClickCancelButton}>Cancel</button>
                    </div >
                }
                {status === Status.PENDIND_ACCEPT &&
                    <>
                        <div>
                            <button id='file_tranfer__button--accept' onClick={handleClickAcceptButton}>Accept</button>
                        </div>
                        <div>
                            <button id='file_tranfer__button--deny' onClick={handleClickDenyButton}>Deny</button>
                        </div>
                    </>}

            </div>

            <div>
                {status === Status.PENDING_PEER_ACCEPT && <div className='sending__status'>
                    <div className='sending__status__text'>
                        Waiting for peer to accept...
                    </div>

                </div>}

                {status === Status.PENDIND_ACCEPT && <div className='sending__status'>
                    <div className='sending__status__text'>
                        <span>This guy wants to send you a file. </span>
                        <span><i className='name'>{fileComing?.fileName}</i></span>
                    </div>

                </div>}

                {status === Status.DENY && <div className='sending__status'>
                    <div className='sending__status__text denied'>
                        <span>&#10060; Denied. </span>

                    </div>

                </div>}
                {
                    status === Status.SENDING && <div className='sending__status__text'>
                        <ProgressBar value={progressProp.value} max={progressProp.max} />
                        <span><i className='name'>{fileComing?.fileName || file?.name}</i></span>
                    </div>
                }

                {status === Status.SUCCESS && <div className='sending__status'>
                    <div className='sending__status__text success'>
                        <span> &#9989; Success. </span>

                    </div>

                </div>}

                {status === Status.ERROR && <div className='sending__status'>
                    <div className='sending__status__text error'>
                        <span> &#10060; Error. </span>
                    </div>

                </div>}
            </div>
        </div>
    )
}