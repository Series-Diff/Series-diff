FROM public.ecr.aws/lambda/python:3.11

# Install scientific libraries required for plugin execution
RUN pip install --no-cache-dir \
    pandas==2.2.0 \
    numpy==1.26.3 \
    scipy==1.12.0 \
    scikit-learn==1.4.0 \
    statsmodels==0.14.1

# Copy handler
COPY handler.py ${LAMBDA_TASK_ROOT}

CMD ["handler.handler"]
