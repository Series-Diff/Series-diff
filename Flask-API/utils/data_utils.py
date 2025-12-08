import pandas as pd


def pivot_file(file, index_col, columns_col, values_col):
    """
    Pivot a CSV or JSON file into a list of dictionaries.

    Args:
        file (FileStorage): The uploaded file (CSV or JSON).
        index_col (str): The column to use as the new index.
        columns_col (str): The column to use to create new columns.
        values_col (str): The column to use for populating values.
    Returns:
        list[dict]: The pivoted data as a list of dictionaries.
    """
    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(file)
        elif file.filename.lower().endswith(".json"):
            df = pd.read_json(file)
        else:
            raise ValueError("Unsupported file format. Use CSV or JSON.")
        # Check if required columns exist
        missing_cols = [
            col for col in [index_col, columns_col, values_col] if col not in df.columns
        ]
        if missing_cols:
            raise ValueError(f"Missing columns in the data: {', '.join(missing_cols)}")
        # Pivot the Dataframe using pivot_table, using mean as aggregation function for duplicates
        pivot_df = df.pivot_table(
            index=index_col, columns=columns_col, values=values_col, aggfunc="mean"
        )
        # Flatten column names (e.g. (30, 31) --> 'data_type_30', 'data_type_31')
        pivot_df.columns = [f"{columns_col}_{col}" for col in pivot_df.columns]
        # Reset index, so that index_col becomes a column again
        pivot_df.reset_index(inplace=True)
        # Date conversion: ensure index_col is string if it contains dates
        if index_col in pivot_df.columns:
            # If it's date then conversion to string
            try:
                pivot_df[index_col] = pivot_df[index_col].astype(str)
            except Exception:
                pass
    except Exception as e:
        raise ValueError(f"Error processing file: {e}")
    # Convert the pivoted DataFrame to a list of records (dicts)
    return pivot_df.to_dict(orient="records")
