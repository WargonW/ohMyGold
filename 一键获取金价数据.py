#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键获取近20年国际金价日度数据
运行后自动下载数据并生成CSV文件
"""

import sys
import subprocess
import os

def install_package(package):
    """自动安装Python包"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package, "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"])
        return True
    except:
        return False

def main():
    print("="*60)
    print("正在准备获取近20年国际金价数据...")
    print("="*60)
    
    # 自动安装依赖
    print("\n正在检查并安装必要的工具...")
    try:
        import yfinance
        import pandas
        print("✅ 工具已准备就绪")
    except ImportError:
        print("正在自动安装依赖...")
        if not install_package("yfinance"):
            print("❌ 安装yfinance失败，请检查网络连接")
            input("按回车键退出...")
            return
        if not install_package("pandas"):
            print("❌ 安装pandas失败，请检查网络连接")
            input("按回车键退出...")
            return
        print("✅ 依赖安装完成")
    
    # 导入依赖
    import yfinance as yf
    import pandas as pd
    from datetime import datetime
    
    # 配置
    START_DATE = "2006-06-10"
    END_DATE = datetime.today().strftime("%Y-%m-%d")
    OUTPUT_FILENAME = f"国际金价日度完整数据_2006-2026_{END_DATE}.csv"
    
    print("\n正在获取数据，请稍候...")
    
    try:
        # 1. 获取COMEX黄金期货
        print("  1/3 获取COMEX黄金期货数据...")
        comex = yf.download("GC=F", start=START_DATE, end=END_DATE, interval="1d", progress=False)
        comex = comex[["Open", "High", "Low", "Close"]].round(2)
        comex.columns = ["COMEX_开盘", "COMEX_最高", "COMEX_最低", "COMEX_收盘"]
        
        # 2. 获取伦敦金现货
        print("  2/3 获取伦敦金现货数据...")
        london = yf.download("XAU-USD", start=START_DATE, end=END_DATE, interval="1d", progress=False)
        london = london[["Open", "High", "Low", "Close"]].round(2)
        london.columns = ["伦敦金_开盘", "伦敦金_最高", "伦敦金_最低", "伦敦金_收盘"]
        
        # 3. 获取汇率
        print("  3/3 获取汇率数据...")
        usd_cny = yf.download("CNY=X", start=START_DATE, end=END_DATE, interval="1d", progress=False)
        usd_cny = usd_cny[["Close"]].round(4)
        usd_cny.columns = ["美元兑人民币"]
        
        # 合并数据
        print("正在处理数据...")
        df = pd.concat([comex, london, usd_cny], axis=1)
        
        # 计算人民币价格
        df["伦敦金_人民币/克(最高)"] = (df["伦敦金_最高"] * df["美元兑人民币"] / 31.1035).round(2)
        df["COMEX_人民币/克(最高)"] = (df["COMEX_最高"] * df["美元兑人民币"] / 31.1035).round(2)
        
        # 清理数据
        df = df.dropna()
        
        # 保存CSV
        df.to_csv(OUTPUT_FILENAME, encoding="utf-8-sig", index_label="Date")
        
        print("\n" + "="*60)
        print("✅ 数据获取完成！")
        print(f"✅ 数据范围：{df.index[0].strftime('%Y-%m-%d')} 至 {df.index[-1].strftime('%Y-%m-%d')}")
        print(f"✅ 总交易日数：{len(df)} 条")
        print(f"✅ 文件已保存为：{os.path.abspath(OUTPUT_FILENAME)}")
        print("="*60)
        print("\n文件已经生成在当前文件夹下，你可以直接打开使用！")
        print("包含字段：日期、COMEX(开/高/低/收)、伦敦金(开/高/低/收)、汇率、人民币最高价")
        
    except Exception as e:
        print(f"\n❌ 出错了：{str(e)}")
        print("请检查你的网络连接，然后重新运行这个程序。")
    
    input("\n按回车键退出...")

if __name__ == "__main__":
    main()
