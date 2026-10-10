import type { UseFormRegisterReturn } from 'react-hook-form';
import { inputCls, labelCls } from './styles';

type Props = {
  label: string;
  registerZh: UseFormRegisterReturn;
  registerEn: UseFormRegisterReturn;
  errorZh?: string;
  errorEn?: string;
  placeholderZh?: string;
  placeholderEn?: string;
};

/**
 * 每个可翻译字段并排渲染「中文 / English」两个输入。
 * 由父级 react-hook-form 的 register 传入受控属性。
 */
export function LocalizedField({
  label,
  registerZh,
  registerEn,
  errorZh,
  errorEn,
  placeholderZh,
  placeholderEn,
}: Props) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            className={inputCls}
            placeholder={placeholderZh ?? '中文'}
            {...registerZh}
          />
          {errorZh ? <p className="mt-1 text-xs text-danger">{errorZh}</p> : null}
        </div>
        <div>
          <input
            className={inputCls}
            placeholder={placeholderEn ?? 'English'}
            {...registerEn}
          />
          {errorEn ? <p className="mt-1 text-xs text-danger">{errorEn}</p> : null}
        </div>
      </div>
    </div>
  );
}
