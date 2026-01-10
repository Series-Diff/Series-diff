# This is documentation of Flask API for Comparison Tool Application

## File Structure

```
|- interfaces – interfaces for application
|- services – utility classes used as services in application
|- tests – Unit tests
| Dockerfile – Dockerfile to containerize API
| README.md – Documentation of API
| requirements.txt - list of python packages needed to run application
| main.py – main file of program
```

## Running Application

You can run the backend of the application by simply typing `python3 main.py` in the terminal or run the whole application using `docker compose up --build`.

To fully rebuild container: `docker compose down -v --rmi all & docker system prune -f & docker builder prune -a -f & docker compose build --no-cache & docker compose up`.

Note: for PowerShell or some other shells, replace `&` with `;`.

## Testing Application

### Unit/Integration Tests (unittest with coverage)
- Tests are in the `tests/` folder (files matching `test_*.py`).
- Run tests with coverage summary: `coverage run -m unittest discover -s tests -p "test_*.py" && coverage report -m`.
- Run with HTML report and auto-open: `coverage run -m unittest discover -s tests -p "test_*.py" && coverage html & start htmlcov\index.html` (runs tests, generates report in `htmlcov/`, and opens `index.html` in default browser).
  - For detailed view, open `htmlcov/index.html` manually.

**Attention**  
Be sure you have unittest and coverage packages installed.

## Endpoints

<h2 style = "color:green">GET:</h2>

<h3><span style= "color:green">/timeseries</span> </h3>
<b>Get all available timeseries</b>

<h3><span style= "color:green">/timeseries?category&filename</span></h3>
<b>Get values from specified category and file</b>

<h3><span style= "color:green">/timeseries/mean?category&filename</span></h3>
<b>Get mean values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/median?category&filename</span></h3>
<b>Get median values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/standard-deviation?category&filename</span></h3>
<b>Get standard deviation values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/variance?category&filename</span></h3>
<b>Get variance values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/autocorrelation?category&filename</span></h3>
<b>Get autocorrelation values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/coefficient_of_variation?category&filename</span></h3>
<b>Get coefficient of variation values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/iqr?category&filename</span></h3>
<b>Get interquartile range values for specified category in the file</b>

<h3><span style= "color:green">/timeseries/pearson_correlation?category&filename1&filename2</span></h3>
<b>Get Pearson correlation coefficient between two files for specified category</b>

<h2 style= "color:blue"> POST:</h2>
<h3><span style= "color:blue">/upload-timeseries</span></h3>
<b>Post new timeseries</b>

<h2 style= "color:red"> DELETE:</h2>
<h3><span style= "color:red">/clear-timeseries</span></h3>
<b>Clear list of timeseries</b>

## Authors

- Michał Bojara
- Mikołaj Szulc
- Franciszka Jędraszak
- Karol Kowalczyk
- Natalia Szymczak
