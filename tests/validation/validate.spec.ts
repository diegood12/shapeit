import { validate, assert } from '@/validation';
import { Rule, RulesSet } from '@/types/validation';
import { NonEmptyArray } from '@/types/utils';
import { times } from 'lodash';

describe('validate function', () => {
    it('validates an input against a rule', async () => {
        const n1 = faker.datatype.number({ min: 6 });
        const n2 = faker.datatype.number({ max: 4 });

        const error = faker.datatype.string();

        const rule: Rule<number> = (n, assert) => assert(n > 5, error);

        const [r1, r2] = await Promise.all([
            validate(n1, rule),
            validate(n2, rule)
        ]);

        expect(r1.valid).toBe(true);
        expect(r2.valid).toBe(false);

        expect(r1.errors).toBe(null);
        expect(r2.errors).toEqual({ $: [error] });
    });

    it('allows multiple rules to be applied on an object', async () => {
        const desc = faker.datatype.string();
        const sym = Symbol(desc);

        const err1 = faker.datatype.string();
        const err2 = faker.datatype.string();

        const rules: NonEmptyArray<Rule<symbol>> = [
            jest.fn(input => assert(input === sym, err1)),
            jest.fn(input => assert(input.description === desc, err2))
        ];

        const r1 = await validate(sym, rules);

        for (const rule of rules) {
            expect(rule).toBeCalled();
        }

        expect(r1.valid).toBe(true);
        expect(r1.errors).toBe(null);

        await expect(validate(sym, ...rules)).resolves.toEqual(r1);

        const r2 = await validate(Symbol(`~${desc}`), rules);

        expect(r2).toEqual({
            valid: false,
            errors: {
                $: [err1, err2]
            }
        });
    });

    it('validates nested objects against rules', async () => {
        const data = genData();

        data.string = faker.datatype.string(5);

        const error = faker.datatype.string();

        const rulesSet: RulesSet<typeof data> = {
            string: (str, assert) => assert(str.length === 5, error)
        };

        const r1 = await validate(data, rulesSet);

        data.string = faker.datatype.string(4);

        const r2 = await validate(data, rulesSet);

        expect(r1.valid).toBe(true);
        expect(r2.valid).toBe(false);

        expect(r1.errors).toBe(null);
        expect(r2.errors).toEqual({ '$.string': [error] });
    });

    it('validates each element of an array with $each property', async () => {
        const length = faker.datatype.number({ min: 3, max: 10 });
        const input = times(length, () => faker.datatype.string(4));

        const error = faker.datatype.string();

        const r1 = await validate(input, {
            $each: (value, assert) => assert(value.length > 3, error)
        });

        expect(r1).toEqual({
            valid: true,
            errors: null
        });

        const r2 = await validate(input, {
            $each: (value, assert) => assert(value.length > 20, error)
        });

        expect(r2).toEqual({
            valid: false,
            errors: input.reduce((res, _, index) => {
                res[`$.${index}`] = [error];
                return res;
            }, {} as Record<string, string[]>)
        });
    });

    it('exposes all errors through errors.all', async () => {
        const messages = times(10, () => faker.datatype.string());

        const { errors } = await validate(
            null,
            messages.map(msg => () => assert(false, msg)) as any
        );

        expect(errors.all).toEqual(messages.map(message => ({
            path: '$', message
        })));
    });

    it('throws if no rules are specified', async () => {
        // @ts-expect-error no rule passed
        await expect(() => validate([])).rejects.toThrow();
    });

    it('throws if a rule throws anything other than an assertion error', async () => {
        const throwable = () => { throw new Error(); };

        await expect(() => validate(null, throwable)).rejects.toThrow();
    });
});
