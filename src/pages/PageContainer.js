import React from 'react';
import './PageContainer.css';

class PageContainer extends React.Component {
    state = {};

    render() {
        return (
            <div className="page-container">
                {this.props.children}
            </div>
        )
    }
}

export default PageContainer;