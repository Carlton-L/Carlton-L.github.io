import React from 'react';
import './Project.css';

class Project extends React.Component {
    state={}

    render() {
        return (
            <div>
                <div className="project-container">
                    <div className="text-container">
                        <h4>UPCOMING PROJECT</h4>
                        <p className="text-content">
                            This project is in the works...
                        </p>
                    </div>
                    <div className="image-container">
                        <div className="overlay-top">
                            <h4>COMING SOON</h4>
                        </div>
                        <img className="image" src="https://cdn.geekwire.com/wp-content/uploads/2019/07/bigstock-Real-Python-Code-Developing-Sc-217216555-630x421.jpg" alt={'project'}/>
                        <div className="overlay-bot">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt={'react-logo'}/>
                        </div>
                    </div>
                </div>
            </div>
        ) 
    }
}

export default Project;