import React from 'react';

const SectionHeader = () => {
    return (
        <div className="section-container panel" data-color="white">
            <div className="container">
                <div className="">
                    Hello, I'm Carlton.
                    <br />A front-end web developer from Seattle.
                </div>
                <br />
                <div className="text-carousel">
                    <div className="default-text">I do </div>
                    <div className="change-text">
                        <div className="text-content">
                            <div className="text">React JS</div>
                            <div className="text">UX Design</div>
                            <div className="text">Vanilla JavaScript</div>
                            <div className="text">Electron JS</div>
                            <div className="text">Node JS</div>
                            <div className="text">React JS</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SectionHeader;
