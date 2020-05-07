import React from 'react'
import ReactDOM from 'react-dom'

import MagicWand from './demo/MagicWand'

const App = () => {
    return <>
        <MagicWand />
    </>
}
ReactDOM.render(
    <App />,
    document.querySelector('#root')
  )
