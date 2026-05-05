variable "aws_region"   { default = "us-east-1" }
variable "cluster_name" { default = "pca-insight-cluster" }
variable "mongodb_uri"  { sensitive = true }
variable "jwt_secret"   { sensitive = true }
