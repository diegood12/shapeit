import { validate } from '@/validation';
import { Rule, RulesSet } from '@/types/validation';

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
        const description = faker.datatype.string();
        const sym = Symbol(description);

        const rules: Rule<symbol>[] = [
            jest.fn((input, assert) => assert(input === sym, '')),
            jest.fn((input, assert) => assert(input.description === description, ''))
        ];

        const result = await validate(sym, rules);

        for (const rule of rules) {
            expect(rule).toBeCalled();
        }

        expect(result.valid).toBe(true);
        expect(result.errors).toBe(null);
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
});