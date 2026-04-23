from pyspark.sql import SparkSession
from pyspark.sql.functions import avg

spark = SparkSession.builder \
    .appName("HostelAnalytics") \
    .getOrCreate()

def process_data(messages):
    if not messages:
        return {}

    df = spark.createDataFrame(messages)

    result = {}

    if "expense" in df.columns:
        result["avg_expense"] = df.select(avg("expense")).collect()[0][0]

    if "category" in df.columns:
        result["top_category"] = df.groupBy("category").count() \
            .orderBy("count", ascending=False).first()["category"]

    return result