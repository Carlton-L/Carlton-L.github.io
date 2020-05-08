import React from 'react';
import PageContainer from '../PageContainer';
import ContentContainer from '../../components/ContentContainer';

class SectionHeader extends React.Component {
    state = {};

    render() {
        return (
            <PageContainer>
                <ContentContainer h="center" v="bottom">
                    <h1>Carlton Lindsay</h1>
                </ContentContainer>
                <ContentContainer h="center" v="top">
                    <h3>Frontend Web Developer</h3>
                </ContentContainer>
            </PageContainer>
        )
    }
}

export default SectionHeader;