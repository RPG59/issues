import React, { ReactNode, useRef, useState, useCallback, ComponentProps } from 'react';
import { useClickOutside, Popup, nullable } from '@taskany/bricks';

import { combobox, comboboxErrorDot } from '../../utils/domObjects';
import { EstimateProps, Estimate } from '../Estimate/Estimate';
import { EstimateYear } from '../EstimateYear/EstimateYear';
import { EstimateQuarter } from '../EstimateQuarter/EstimateQuarter';
import { EstimateDate } from '../EstimateDate/EstimateDate';

import s from './EstimatePopup.module.css';

export interface EstimatePopupProps extends Omit<EstimateProps, 'children'> {
    error?: { message?: string };
    renderTrigger: (values: { onClick: () => void }) => ReactNode;
    placement?: ComponentProps<typeof Popup>['placement'];
    onClose?: () => void;
    onOpen?: () => void;
}

export const EstimatePopup = React.forwardRef<HTMLDivElement, EstimatePopupProps>(
    ({ renderTrigger, onClose, onOpen, placement, error, value, onChange }, ref) => {
        const triggerRef = useRef<HTMLDivElement>(null);
        const popupContentRef = useRef<HTMLDivElement>(null);
        const [visible, setVisible] = useState(false);

        const errorRef = useRef<HTMLDivElement>(null);
        const [errorVisible, setErrorVisible] = useState(false);

        const onMouseEnter = useCallback(() => setErrorVisible(true), []);
        const onMouseLeave = useCallback(() => setErrorVisible(false), []);

        const onToggleVisible = useCallback(() => {
            setVisible((prev) => {
                if (prev) {
                    onClose?.();
                } else {
                    onOpen?.();
                }
                return !prev;
            });
        }, [onClose, onOpen]);

        useClickOutside(triggerRef, (e) => {
            if (!popupContentRef.current?.contains(e.target as Node)) {
                setVisible(false);
                onClose?.();
            }
        });

        return (
            <div ref={ref} {...combobox.attr}>
                {nullable(error, (err) => (
                    <>
                        <div
                            className={s.ErrorTrigger}
                            ref={errorRef}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            {...comboboxErrorDot.attr}
                        />
                        <Popup tooltip view="danger" placement="top-start" visible={errorVisible} reference={errorRef}>
                            {err.message}
                        </Popup>
                    </>
                ))}

                <div ref={triggerRef}>{renderTrigger({ onClick: onToggleVisible })}</div>

                <Popup
                    visible={visible}
                    placement={placement}
                    reference={triggerRef}
                    interactive
                    minWidth={180}
                    maxWidth={180}
                    className={s.Popup}
                >
                    <Estimate value={value} onChange={onChange} ref={popupContentRef}>
                        <EstimateYear />
                        <EstimateQuarter />
                        <EstimateDate />
                    </Estimate>
                </Popup>
            </div>
        );
    },
);
