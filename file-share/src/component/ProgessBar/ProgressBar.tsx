import './ProgressBar.scss'

export interface ProgressProp {
    value: number
    max: number
}

export const ProgressBar: React.FC<ProgressProp> = ({ value, max }) => {
    return (
        <progress className='progress' max={max} value={value}></progress>
    )
}