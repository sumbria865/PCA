terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.aws_region }

module "vpc" {
  source             = "terraform-aws-modules/vpc/aws"
  version            = "5.0.0"
  name               = "pca-insight-vpc"
  cidr               = "10.0.0.0/16"
  azs                = ["\a", "\b"]
  private_subnets    = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets     = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true
}

resource "aws_ecr_repository" "services" {
  for_each = toset(["auth-service", "analysis-service", "ml-service", "frontend"])
  name     = "pca-insight/\"
  force_delete = true
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "20.0.0"
  cluster_name    = var.cluster_name
  cluster_version = "1.29"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      min_size       = 2
      max_size       = 4
      desired_size   = 2
      instance_types = ["t3.medium"]
    }
  }
}
