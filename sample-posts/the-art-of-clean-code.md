# The Art of Clean Code

Writing clean code is not just about making your code work — it's about making it readable, maintainable, and elegant.

## What is Clean Code?

Clean code is code that is:

1. **Easy to read** — Any developer can understand it quickly
2. **Easy to modify** — Changes don't cause unexpected side effects  
3. **Well-tested** — You can trust it works as intended
4. **Focused** — Each function does one thing well

## Key Principles

### 1. Meaningful Names

```python
# Bad
def calc(x, y):
    return x * y * 0.0825

# Good
def calculate_sales_tax(price, quantity):
    TAX_RATE = 0.0825
    return price * quantity * TAX_RATE
```

### 2. Small Functions

> Functions should do one thing. They should do it well. They should do it only. — Robert C. Martin

### 3. DRY (Don't Repeat Yourself)

If you find yourself copying and pasting code, it's time to refactor.

### 4. Comments That Explain "Why"

```python
# Bad comment - explains what (obvious from code)
# Increment counter by 1
counter += 1

# Good comment - explains why
# Compensate for the off-by-one error in the upstream API
counter += 1
```

## The Boy Scout Rule

> "Leave the codebase cleaner than you found it."

Every time you touch a piece of code, make a small improvement. Over time, the entire codebase gets better.

## Recommended Reading

- **Clean Code** by Robert C. Martin
- **The Pragmatic Programmer** by Hunt & Thomas
- **Refactoring** by Martin Fowler

---

Clean code is a journey, not a destination. Keep learning, keep improving, and your future self (and teammates) will thank you.
