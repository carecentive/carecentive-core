const Role = require("../models/Role");

const PermissionService = require("./PermissionService");

class RoleService {

  /**
   * 
   * @param {int or string} role The ID or readable name of a role
   * @returns 
   */
  static async getByIdOrName(role) {
    if(typeof role === "number" && Number.isInteger(role)) {
      return await Role.query().findById(role);
    }
    else if(typeof role === "string") {
      return await Role.query().findOne('name', role)
    }
    return false;
  }

  /**
   * Returns the permissions of the specified role as array
   * @param {*} role ID or name of role
   * @returns {array or boolean} Array of permissions or false
   */
  static async getPermissions(role) {
    role = await this.getByIdOrName(role)

    if(role) {
      let permissions = await role.$relatedQuery('permissions') 
      return permissions; 
    }
    return false;
  }
  
  /**
   * Checks whether the specified role has the specified permission
   * @param {*} role ID or readableName
   * @param {*} permission ID or readableName
   * @returns {Boolean}
   */
  static async hasPermission(role, permission) {
    role = await RoleService.getByIdOrName(role)
    permission = await PermissionService.getByIdOrName(permission)

    if(role === false || permission === false) {
      return false;
    }

    let rolePermissions = await this.getPermissions(role.id)
    
    if(rolePermissions) {
      for (let rolePermission of rolePermissions) {
        if(rolePermission.id === permission.id) {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = RoleService;