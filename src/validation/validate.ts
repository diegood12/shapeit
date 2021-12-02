import { NonEmptyArray } from '../types/utils';
import { RulesSet, ValidationResult } from '../types/validation';

/**
 * Validates an object against one or multiple sets of rules.
 *
 * A set of rules can be
 *
 * 1. A validation function that receives the original and an assert function
 *
 * 2. A validation object containing some of the input's keys, each one matching
 *    a set of rules for the corresponding key on the input
 *
 * 3. An array containing multiple sets of rules
 *
 * @example
 * const number = 10;
 *
 * const result = await validate(number, async (number, assert) => {
 *   assert(number < 0, 'Number must be negative');
 *   await doSomethingWithAnAPI(number, assert);
 * });
 *
 * @example
 * const person = {
 *   name: 'John',
 *   age: 32
 * };
 *
 * const result = await validate(person, {
 *   name: (name, assert) => {
 *     assert(name === 'John', 'You must be John');
 *   },
 *   age: (age, assert) => {
 *     assert(age >= 18, 'You must be at least 18 years old');
 *   }
 * });
 *
 * @example
 * const person = {
 *   name: 'John',
 *   age: 32,
 *   yearsOfExperience: 5
 * };
 *
 * const result = await validate(person, [
 *   (person, assert) => assert(
 *     person.yearsOfExperience < person.age,
 *     'You cannot have worked THAT hard'
 *   ),
 *   {
 *     name: (name, assert) => {
 *       assert(name === 'John', 'You must be John');
 *     },
 *     age: (age, assert) => {
 *       assert(age >= 18, 'You must be at least 18 years old');
 *     }
 *   }
 * ]);
 */
export default async function validate<T>(
    input: T, ...rules: NonEmptyArray<RulesSet<T>>
): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};

    if (!rules.length) {
        throw new Error('No rule specified');
    }

    // This avoids an unnecessary level of recursion
    const rulesSet = rules.length > 1 ? rules : rules[0];

    await applyRulesRecursively(input, rulesSet, '$', errors);

    return Object.keys(errors).length ? {
        valid: false, errors
    } : {
        valid: true, errors: null
    };
}


function createAsserter() {
    const errors: string[] = [];

    const assert = <T>(cond: T, msg: string) => {
        if (!cond) errors.push(msg);

        return cond;
    };

    return [assert, errors] as const;
}

async function applyRulesRecursively<T>(
    input: T,
    rules: RulesSet<T>,
    path: string,
    errors: Record<string, string[]>
): Promise<void> {
    if (typeof rules === 'function') {
        const isValid = rules;

        const [assert, assertionErrors] = createAsserter();

        await isValid(input, assert);

        if (assertionErrors.length) {
            (errors[path] ||= []).push(...assertionErrors);
        }
    }
    else {
        let promises: Promise<void>[] = [];

        if (Array.isArray(rules)) {
            promises = rules.map(
                rule => applyRulesRecursively(input, rule, path, errors)
            );
        }
        else if (Array.isArray(input) && '$each' in rules) {
            promises = input.map((v, i) => applyRulesRecursively(
                v, rules.$each, `${path}.${i}`, errors
            ));
        }
        else if (typeof input === 'object' && input !== null) {
            const keys = Object.keys(rules) as (keyof T)[];

            promises = keys
                .filter(key => key in input)
                .map(key => applyRulesRecursively(
                    input[key], (rules as any)[key],
                    `${path}.${key}`, errors
                ));
        }

        await Promise.all(promises);
    }
}
