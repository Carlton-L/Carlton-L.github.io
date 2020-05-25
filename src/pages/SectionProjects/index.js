import React from 'react';
import PageContainer from '../PageContainer';
import ContentContainer from '../../components/ContentContainer';
import Project from './Project';

// TODO: Make every other project's content flipped (image and caption)
class SectionProjects extends React.Component {
    state = {};

    render() {
        return (
            <PageContainer>
                <ContentContainer>
                    <h2 className="margin-bottom-medium">Projects</h2>
                </ContentContainer>
                <ContentContainer h="center">
                    <Project>

                    </Project>
                </ContentContainer>
            </PageContainer>
        )
    }
}

export default SectionProjects;