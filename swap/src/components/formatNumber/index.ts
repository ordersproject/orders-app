import { formatNumberForDisplay } from 'common/utils';

export default function FormatNumber(props) {
  const { value, prefix, suffix, round, padRight, useAbbr } = props;
  return (
    <>
      {formatNumberForDisplay({
        value,
        prefix,
        suffix,
        round,
        padRight,
        useAbbr,
      }).toString()}
    </>
  );
}
