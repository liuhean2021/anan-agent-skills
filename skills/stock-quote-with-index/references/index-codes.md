# 指数与市场参数

`tdx_quotes` 的 `code` 只接受纯数字（美股指数除外），`setcode` 必须与 `code` 匹配，不匹配会返回空数据。

## 默认大盘指数（每次都查）

| 指数 | code | setcode | 备注 |
|---|---|---|---|
| 上证指数 | `000001` | `1` | 与深市「平安银行 000001」重名，靠 setcode 区分 |
| 深证成指 | `399001` | `0` | |
| 创业板指 | `399006` | `0` | |
| 沪深 300 | `000300` | `62` | 中证指数，无涨跌家数字段 |
| 科创 50 | `000688` | `1` | |

调用示例（每个指数一次，与个股调用并行）：

```text
tdx_quotes(code="000001", setcode="1", hasHQInfo="1", bspNum="0")
tdx_quotes(code="399001", setcode="0", hasHQInfo="1", bspNum="0")
tdx_quotes(code="399006", setcode="0", hasHQInfo="1", bspNum="0")
tdx_quotes(code="000300", setcode="62", hasHQInfo="1", bspNum="0")
tdx_quotes(code="000688", setcode="1", hasHQInfo="1", bspNum="0")
```

## 个股 setcode

| 板块 | 代码开头 | setcode |
|---|---|---|
| 沪市主板、科创板 | 60、68 | `1` |
| 深市主板、创业板 | 00、30 | `0` |
| 北交所 | 43、83、87 | `2` |
| 港股 | 5 位数字 | `31` |

## 美股指数（用户明确要求时才查）

| 指数 | code | setcode |
|---|---|---|
| 纳斯达克综合 | `A_IXIC` | `12` |
| 标普 500 | `A_SPX` | `12` |

美股时间戳为北京时间；`Close` 仍按昨收理解，但纳指与标普的时间戳可能不一致，需提示「现价是否为最后一笔」无法完全确认。

## 字段速查（`HQInfo`）

| 字段 | 含义 |
|---|---|
| `Now` | 现价 |
| `Close` | 昨收 |
| `Open` / `MaxP` / `MinP` | 今开 / 最高 / 最低 |
| `Average` | 均价 |
| `Amount` | 成交额（元） |
| `LB` | 量比 |
| `HSL` | 换手率（%） |
| `上涨家数` / `下跌家数` / `平家数` | 仅个股以外的 A 股指数有 |
| `HQDate` / `HQTime` | 行情日期 / 时间（`HHMMSS`，前导 0 省略） |

`ExtInfo.ZTPrice` / `DTPrice` 为个股涨跌停价。
