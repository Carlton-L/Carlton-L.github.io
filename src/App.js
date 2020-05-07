import React from 'react';
import SectionHeader from './pages/SectionHeader';
import SectionProjects from './pages/SectionProjects';
import SectionContact from './pages/SectionContact';

const sectionStyle = {
    paddingTop: '50vh',
    paddingBottom: '50vh'
}

const App = () => {
    return (
        <div>
            <section
                data-background-color='rgb(81, 24, 69)'
                className='js-color-stop'
                style={sectionStyle}
            >
                <SectionHeader />
            </section>
            <section
                data-background-color='rgb(144, 12, 63)'
                className='js-color-stop'
                style={sectionStyle}
            >
                <SectionProjects />
            </section>
            <section
                data-background-color='rgb(199, 0, 57)'
                className='js-color-stop'
                style={sectionStyle}
            >
                <SectionContact />
            </section>
        </div>
    )
}

export default App;