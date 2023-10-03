import { Input } from '@taskany/bricks';
import { IconXSolid } from '@taskany/icons';
import { useState, useCallback, useEffect } from 'react';
import InputMask from 'react-input-mask';

import { useLocale } from '../../hooks/useLocale';
import { currentLocaleDate, parseLocaleDate, createLocaleDate } from '../../utils/dateTime';
import { EstimateOption } from '../EstimateOption';
import { useEstimateContext } from '../Estimate/EstimateProvider';

import { tr } from './EstimateDate.i18n';

const expectedLength = 8;
const isDateFullyFilled = (date: string) => {
    const cleanedDate = date.replace(/[^0-9]/g, '');
    return cleanedDate.length === expectedLength;
};

export const EstimateDate: React.FC = () => {
    const locale = useLocale();
    const currentDate = currentLocaleDate({ locale });

    const { readOnly, setReadOnly, setDate } = useEstimateContext();

    const [fullDate, setFullDate] = useState<string>(currentDate);

    useEffect(() => {
        if (!readOnly.date) {
            setFullDate((oldDate) => (isDateFullyFilled(oldDate) ? oldDate : currentDate));
        } else {
            setFullDate(currentDate);
        }
    }, [readOnly.date, currentDate]);

    useEffect(() => {
        if (isDateFullyFilled(fullDate)) {
            setDate(parseLocaleDate(fullDate, { locale }));
        }
    }, [fullDate, setDate, locale]);

    const onInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target;

            if (!isDateFullyFilled(value)) {
                setFullDate(value);
                return;
            }

            const date = parseLocaleDate(value, { locale });

            if (Number.isNaN(new Date(date).getTime())) {
                setFullDate(currentDate);
                return;
            }

            setFullDate(createLocaleDate(date, { locale }));
        },
        [currentDate, locale],
    );

    const onRemoveDate = useCallback(() => {
        setFullDate(currentDate);
    }, [currentDate]);

    const onClick = useCallback(() => {
        setReadOnly({
            date: false,
            year: true,
            quarter: true,
        });
        setFullDate(currentDate);
    }, [currentDate, setReadOnly]);

    return (
        <EstimateOption
            title={tr('Date title')}
            clue={tr('Date clue')}
            readOnly={readOnly.date}
            onClick={onClick}
            renderTrigger={() => (
                <InputMask
                    mask={tr('Date input mask')}
                    placeholder={tr('Date input mask placeholder')}
                    onChange={onInputChange}
                    value={fullDate}
                >
                    {/* @ts-ignore incorrect type in react-input-mask */}
                    {(props) => <Input iconRight={<IconXSolid size="xxs" onClick={onRemoveDate} />} {...props} />}
                </InputMask>
            )}
        />
    );
};