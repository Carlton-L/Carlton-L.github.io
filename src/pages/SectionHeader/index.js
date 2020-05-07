import React from 'react';
import { findRenderedComponentWithType } from 'react-dom/test-utils';

class SectionHeader extends React.Component {
    state = {};

    render() {
        return (
            <h1 style={{fontSize: '50px', color: 'white', textTransform: 'uppercase', letterSpacing: '100px'}}>Carlton Lindsay</h1>
        )
    }
}

export default SectionHeader;