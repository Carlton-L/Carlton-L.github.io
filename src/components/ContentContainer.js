import React from 'react';
import './ContentContainer.css';

class ContentContainer extends React.Component {
    state ={}

    render() {
        return (
            <div className={`${this.props.v === 'center' ? 'vertical-center' : this.props.v} ${this.props.h === 'center' ? 'horizontal-center' : this.props.h} content-container`}>
                {this.props.children}
            </div>
        )
    }
}

ContentContainer.defaultProps = {
    h: 'left',
    v: 'top'
};

export default ContentContainer;