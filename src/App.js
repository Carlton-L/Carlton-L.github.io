import React from 'react';
import './App.css';
import SectionHeader from './pages/SectionHeader';
import SectionProjects from './pages/SectionProjects';
import SectionContact from './pages/SectionContact';



const App = () => {
    return (
        <div>
            <section
                data-background-color='rgb(81, 24, 69)'
                className='js-color-stop'
            >
                <SectionHeader />
            </section>
            <section
                data-background-color='rgb(144, 12, 63)'
                className='js-color-stop'
            >
                <SectionProjects />
            </section>
            <section
                data-background-color='rgb(199, 0, 57)'
                className='js-color-stop'
            >
                <SectionContact />
            </section>
        </div>
    )
}

export default App;