import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { nullable } from '@taskany/bricks';
import { Text } from '@taskany/bricks/harmony';
import { IconExclamationCircleSolid } from '@taskany/icons';

import { createDateRange, isPastDate, getQuarterFromDate, getYearFromDate, getDateString } from '../../utils/dateTime';
import { DateType, DateRange, QuartersAliases } from '../../types/date';
import { estimateComboboxWrongDateMessage } from '../../utils/domObjects';

import { tr } from './Estimate.i18n';
import { EstimateContextProvider } from './EstimateProvider';
import s from './Estimate.module.css';

export interface EstimateValue {
    type: DateType;
    range: DateRange;
    alias?: QuartersAliases;
}

export interface EstimateProps {
    value?: EstimateValue;
    onChange?: (value?: EstimateValue) => void;
    children: ReactNode;
}

export const getReadOnlyFields = (type: EstimateValue['type']) => {
    if (type === 'Strict') {
        return { year: true, quarter: true, date: false };
    }
    if (type === 'Quarter') {
        return { year: false, quarter: false, date: true };
    }
    return { year: false, quarter: true, date: true };
};

export const Estimate = React.forwardRef<HTMLDivElement, EstimateProps>(({ value, onChange, children }, ref) => {
    const [readOnly, setReadOnly] = useState(
        value ? getReadOnlyFields(value.type) : { year: true, quarter: true, date: true },
    );
    const [year, setYear] = useState(value ? getYearFromDate(value.range.end) : undefined);
    const [quarter, setQuarter] = useState(value ? getQuarterFromDate(value.range.end) : undefined);
    const [quarterAlias, setQuarterAlias] = useState(value?.alias);
    const [date, setDate] = useState(value ? value.range.end : undefined);

    const countedValue = useMemo(() => {
        if (readOnly.quarter && readOnly.year && readOnly.date) {
            return;
        }

        if (!readOnly.quarter) {
            return year
                ? {
                      range: createDateRange(year, quarter),
                      type: quarter ? DateType.Quarter : DateType.Year,
                      alias: quarter ? quarterAlias : undefined,
                  }
                : undefined;
        }
        if (!readOnly.year) {
            return year
                ? {
                      range: createDateRange(year),
                      type: DateType.Year,
                  }
                : undefined;
        }
        return date
            ? {
                  range: { end: date, start: null },
                  type: DateType.Strict,
              }
            : undefined;
    }, [year, quarter, date, quarterAlias, readOnly]);

    useEffect(() => {
        const oldStartDate = value && value.range.start ? getDateString(value.range.start) : null;
        const newStartDate = countedValue && countedValue.range.start ? getDateString(countedValue.range.start) : null;

        const oldEndDate = value ? getDateString(value.range.end) : null;
        const newEndDate = countedValue ? getDateString(countedValue.range.end) : null;

        if (
            value?.type !== countedValue?.type ||
            value?.alias !== countedValue?.alias ||
            oldStartDate !== newStartDate ||
            oldEndDate !== newEndDate
        ) {
            onChange?.(countedValue);
        }
    }, [countedValue, value, onChange]);

    const warning = useMemo(
        () => (countedValue && isPastDate(countedValue.range.end) ? { message: tr('Date is past') } : undefined),
        [countedValue],
    );

    const context = useMemo(
        () => ({
            readOnly,
            setReadOnly,
            year,
            setYear,
            quarter,
            setQuarter,
            quarterAlias,
            setQuarterAlias,
            date,
            setDate,
        }),
        [readOnly, year, quarter, quarterAlias, date],
    );

    return (
        <div className={s.EstimateWrapper} ref={ref}>
            {nullable(warning, (warn) => (
                <div className={s.EstimateWarningWrapper} {...estimateComboboxWrongDateMessage.attr}>
                    <IconExclamationCircleSolid className={s.EstimateIcon} size="xs" />
                    <Text size="xs">{warn.message}</Text>
                </div>
            ))}

            <EstimateContextProvider value={context}>{children}</EstimateContextProvider>
        </div>
    );
});
