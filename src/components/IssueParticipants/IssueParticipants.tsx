import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { nullable } from '@taskany/bricks';

import { Goal } from '../../../graphql/@generated/genql';
import { dispatchModalEvent, ModalEvent } from '../../utils/dispatchModal';
import { IssueParticipantsForm } from '../IssueParticipantsForm/IssueParticipantsForm';
import { IssueParticipantsList } from '../IssueParticipantsList';

import { tr } from './IssueParticipants.i18n';

const ModalOnEvent = dynamic(() => import('../ModalOnEvent'));

interface IssueParticipantsProps {
    issue: Goal;

    onChange?: React.ComponentProps<typeof IssueParticipantsForm>['onChange'];
}

const IssueParticipants: React.FC<IssueParticipantsProps> = ({ issue, onChange }) => {
    const onParticipantsEdit = useCallback(() => {
        if (onChange) {
            dispatchModalEvent(ModalEvent.IssueParticipantsModal)();
        }
    }, [onChange]);

    return (
        <>
            <IssueParticipantsList
                title={tr('Participants')}
                participants={issue.participants}
                onEdit={onChange ? onParticipantsEdit : undefined}
            />

            {nullable(onChange, () => (
                <ModalOnEvent event={ModalEvent.IssueParticipantsModal}>
                    <IssueParticipantsForm issue={issue} onChange={onChange} />
                </ModalOnEvent>
            ))}
        </>
    );
};

export default IssueParticipants;