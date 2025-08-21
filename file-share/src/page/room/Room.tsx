import { useParams } from "react-router-dom";
import './Room.scss';
import Card from "../../component/Card/Card";
import { Header } from "../../component/Header/Header";
import { useContext } from "react";
import { SocketContext, SocketProvider } from "../../context/socketContext/SocketContext";


const Room: React.FC = () => {

    const { id } = useParams<{ id: string }>();

    const context = useContext(SocketContext)

    if (!context) {
        console.error('Not found socket context!');

        return
    }

    const { socket, me, error, listUser } = context


    const copyCode = () => {
        navigator.clipboard.writeText(String(id));

    }

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
    }

    return (

        <div className="room">
            <Header />
            <div className="room__info">
                <h3><span>Room:</span></h3>
                <div className="room__info__id" title="Copy Code" onClick={() => copyCode()}>
                    <span>{id}</span>
                </div>
                <h3><span>or</span></h3>
                <div className="room__info__link" title='Copy Link' onClick={() => copyLink()}>
                    <i className="bi bi-link-45deg"></i>
                </div>

            </div>




            {!error ? !socket || !me ?
                <div className="room__connect">
                    <h1>Connecting...</h1>
                </div> :

                <div className="room__body">
                    <div className="profile">
                        <div className="profile__avatar">
                            <img src={me.avatar} alt="" />
                        </div>
                        <div className="profile__name"><span>{me.name} (You)</span></div>
                    </div>

                    <div className="list__card">
                        {listUser.map((user, index) => {
                            return <Card key={index} profile={user} yourID={me.id} />
                        })}
                    </div>
                </div> :
                <div className="room__connect">
                    <h1>Something was wrong!</h1>
                </div>
            }


        </div >
    );
};




export const RoomWrapper = () => {
    const { id } = useParams();
    return (
        <SocketProvider roomId={String(id)}>
            <Room />
        </SocketProvider>
    );
};;