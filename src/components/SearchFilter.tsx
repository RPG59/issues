import { FC, useCallback } from 'react';
import { debounce } from 'throttle-debounce';
import { FormControl, FormControlInput } from '@taskany/bricks/harmony';

export const SearchFilter: FC<{
    placeholder?: string;
    defaultValue?: string;
    onChange: (search: string) => void;
}> = ({ placeholder, defaultValue, onChange }) => {
    const debouncedSearchHandler = debounce(200, onChange);

    const onSearchInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => debouncedSearchHandler(e.currentTarget.value),
        [debouncedSearchHandler],
    );
    return (
        <FormControl>
            <FormControlInput
                outline
                size="xs"
                placeholder={placeholder}
                defaultValue={defaultValue}
                onChange={onSearchInputChange}
            />
        </FormControl>
    );
};
