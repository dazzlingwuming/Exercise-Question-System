"""Small bounded arithmetic interpreter; no eval, Python execution or model call."""

import ast
import math
import operator

from app.schemas.studio import MathRequest

FUNCTIONS = {name: getattr(math, name) for name in ("sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "log", "log10", "exp", "floor", "ceil")}
FUNCTIONS["abs"] = abs
CONSTANTS = {"pi": math.pi, "e": math.e}
OPERATORS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.Pow: math.pow}


class MathInputError(ValueError):
    pass


def parse_expression(source: str, allow_x: bool) -> ast.Expression:
    source = source.strip().replace("^", "**").replace("π", "pi").replace("×", "*").replace("÷", "/").replace("−", "-")
    if not source or len(source) > 600:
        raise MathInputError("表达式不能为空或过长。")
    try:
        tree = ast.parse(source, mode="eval")
    except (SyntaxError, RecursionError) as exc:
        raise MathInputError("表达式格式不正确。乘法请写 *，例如 2*x。") from exc
    if len(list(ast.walk(tree))) > 100:
        raise MathInputError("表达式过于复杂，请拆分计算。")

    def validate(node, depth=0):
        if depth > 20:
            raise MathInputError("表达式嵌套过深。")
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            finite(node.value)
        elif isinstance(node, ast.Name) and (node.id in CONSTANTS or (allow_x and node.id == "x")):
            pass
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            validate(node.operand, depth + 1)
        elif isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
            validate(node.left, depth + 1)
            validate(node.right, depth + 1)
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS and len(node.args) == 1 and not node.keywords:
            validate(node.args[0], depth + 1)
        else:
            raise MathInputError("只支持数字、四则运算、幂、pi、e 和列出的单参数函数；作图时可使用 x。")
    validate(tree.body)
    return tree


def finite(value) -> float:
    value = float(value)
    if not math.isfinite(value) or abs(value) > 1e100:
        raise MathInputError("结果超出计算范围。")
    return value


def evaluate(node, x: float = 0) -> float:
    if isinstance(node, ast.Constant):
        return finite(node.value)
    if isinstance(node, ast.Name):
        return x if node.id == "x" else CONSTANTS[node.id]
    if isinstance(node, ast.UnaryOp):
        return evaluate(node.operand, x) * (-1 if isinstance(node.op, ast.USub) else 1)
    if isinstance(node, ast.BinOp):
        left, right = evaluate(node.left, x), evaluate(node.right, x)
        if isinstance(node.op, ast.Pow) and abs(right) > 1000:
            raise MathInputError("指数的绝对值不能超过 1000。")
        return finite(OPERATORS[type(node.op)](left, right))
    return finite(FUNCTIONS[node.func.id](evaluate(node.args[0], x)))


def calculate(request: MathRequest) -> dict:
    tree = parse_expression(request.expression, request.plot)
    if not request.plot:
        try:
            value = evaluate(tree.body)
        except (ValueError, OverflowError, ZeroDivisionError) as exc:
            raise MathInputError("无法在实数范围内计算，请检查定义域、除数和数值大小。") from exc
        return {"expression": request.expression, "value": value, "formatted": format(value, ".12g"), "points": []}
    if request.x_max - request.x_min < 1e-6:
        raise MathInputError("右端点必须大于左端点，区间至少为 0.000001。")
    points = []
    for i in range(401):
        x = request.x_min + (request.x_max - request.x_min) * i / 400
        try:
            y = evaluate(tree.body, x)
        except (ValueError, OverflowError, ZeroDivisionError):
            y = None
        points.append([x, y])
    if all(y is None for _, y in points):
        raise MathInputError("这个区间内没有可绘制的实数值，请调整函数或范围。")
    return {"expression": request.expression, "value": None, "points": points, "x_min": request.x_min, "x_max": request.x_max}
