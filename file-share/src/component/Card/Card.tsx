
import { FileTranfer } from '../FileTranfer/FileTranfer';
import './Card.scss'

export interface Profile { id: string, avatar: string, name: string, roomId: string }

const Card: React.FC<{ profile: Profile, yourID: String }> = ({ profile, yourID }) => {




    return (
        <div className="card">
            <div className="left">
                <div className="card__avatar">
                    <img src={profile.avatar} alt="avatar" />
                </div>

                <div className="card__name">
                    {profile.name}
                </div>
            </div>

            <div className="right">
                <div className='card__file'>
                    <FileTranfer yourID={yourID} peerID={profile.id} />
                </div>
            </div>
        </div>
    )
}
export default Card;